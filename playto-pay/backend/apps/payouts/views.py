import time
import csv
import io
import uuid
from django.http import HttpResponse
from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Frame, PageTemplate
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.graphics.shapes import Drawing, Rect, String, Line
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.widgets.markers import makeMarker
from django.contrib.auth.models import User
from django.db import transaction
from apps.payouts.models import Payout
from apps.merchants.models import Merchant, BankAccount
from apps.ledger.models import LedgerEntry
from .serializers import (
    PayoutSerializer, PayoutCreateSerializer, 
    MerchantSerializer, BankAccountSerializer,
    LedgerEntrySerializer
)
from .services import PayoutService

class PayoutViewSet(viewsets.ModelViewSet):
    serializer_class = PayoutSerializer

    def get_queryset(self):
        return Payout.objects.filter(merchant=self.request.user.merchant).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        serializer = PayoutCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        idempotency_key = request.headers.get('Idempotency-Key')
        
        try:
            payout = PayoutService.create_payout(
                merchant_id=request.user.merchant.id, # Use logged-in merchant
                bank_account_id=serializer.validated_data['bank_account_id'],
                amount_paise=serializer.validated_data['amount_paise'],
                idempotency_key_str=idempotency_key
            )
            return Response(PayoutSerializer(payout).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class DashboardView(views.APIView):
    def get(self, request):
        merchant = request.user.merchant
        
        # Integrity Check: Total Assets (Available + Held) must match Ledger Final In/Out
        ledger_stats = LedgerEntry.objects.filter(merchant=merchant).aggregate(
            total_in=Sum('amount_paise', filter=views.models.Q(type__in=['CREDIT', 'REFUND'])),
            total_out=Sum('amount_paise', filter=views.models.Q(type__in=['DEBIT']))
        )
        
        total_in = ledger_stats['total_in'] or 0
        total_out = ledger_stats['total_out'] or 0
        total_assets = total_in - total_out

        return Response({
            'merchant_name': merchant.name,
            'available_balance_paise': merchant.available_balance_paise,
            'held_balance_paise': merchant.held_balance_paise,
            'calculated_integrity_balance': total_assets,
            'payout_stats': {
                'total_pending': Payout.objects.filter(merchant=merchant, status='pending').count(),
                'total_completed': Payout.objects.filter(merchant=merchant, status='completed').count(),
                'total_failed': Payout.objects.filter(merchant=merchant, status='failed').count(),
            },
            'volume_data': self.get_volume_data(merchant)
        })

    def get_volume_data(self, merchant):
        seven_days_ago = timezone.now().date() - timedelta(days=6)
        
        # Aggregate daily volume
        daily_volume = Payout.objects.filter(
            merchant=merchant,
            status='completed',
            created_at__date__gte=seven_days_ago
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            volume=Sum('amount_paise')
        ).order_by('date')

        # Format for chart (Last 7 days)
        volume_map = { (seven_days_ago + timedelta(days=i)): 0 for i in range(7) }
        for entry in daily_volume:
            volume_map[entry['date']] = entry['volume'] / 100

        return [
            { 'name': date.strftime('%a'), 'volume': vol }
            for date, vol in volume_map.items()
        ]

class PayoutExportView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        merchant = request.user.merchant
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        payouts = Payout.objects.filter(merchant=merchant)
        if start_date:
            payouts = payouts.filter(created_at__date__gte=start_date)
        if end_date:
            payouts = payouts.filter(created_at__date__lte=end_date)

        response = HttpResponse(content_type='text/csv')
        filename = f"payouts_{timezone.now().strftime('%Y-%m-%d')}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(['ID', 'Status', 'Amount (INR)', 'Bank', 'Account', 'Attempts', 'Created At'])

        for p in payouts.select_related('bank_account'):
            writer.writerow([
                p.id,
                p.status,
                p.amount_paise / 100,
                p.bank_account.bank_name,
                f"****{p.bank_account.account_number[-4:]}",
                p.attempts,
                p.created_at.strftime('%Y-%m-%d %H:%M:%S')
            ])

        return response

class LedgerExportView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        merchant = request.user.merchant
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        entries = LedgerEntry.objects.filter(merchant=merchant)
        if start_date:
            entries = entries.filter(created_at__date__gte=start_date)
        if end_date:
            entries = entries.filter(created_at__date__lte=end_date)

        response = HttpResponse(content_type='text/csv')
        filename = f"ledger_{timezone.now().strftime('%Y-%m-%d')}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(['ID', 'Type', 'Amount (INR)', 'Reference', 'Description', 'Timestamp'])

        for e in entries:
            writer.writerow([
                e.id,
                e.type,
                e.amount_paise / 100,
                e.reference_id,
                e.description,
                e.created_at.strftime('%Y-%m-%d %H:%M:%S')
            ])

        return response

class PayoutPDFExportView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        merchant = request.user.merchant
        payouts = Payout.objects.filter(merchant=merchant).order_by('-created_at')
        
        # --- PREPARE DATA ---
        stats = payouts.aggregate(
            total_requests=Count('id'),
            success_count=Count('id', filter=Q(status='completed')),
            success_amount=Sum('amount_paise', filter=Q(status='completed')),
            failed_amount=Sum('amount_paise', filter=Q(status='failed')),
            pending_amount=Sum('amount_paise', filter=Q(status='pending')),
            total_sum=Sum('amount_paise')
        )
        
        stats['avg_payout'] = (stats['total_sum'] / stats['total_requests']) if stats['total_requests'] > 0 else 0
        
        success_rate = (stats['success_count'] / stats['total_requests'] * 100) if stats['total_requests'] > 0 else 100

        # Reconciliation Logic
        ledger_stats = LedgerEntry.objects.filter(merchant=merchant).aggregate(
            total_credits=Sum('amount_paise', filter=Q(type='CREDIT')),
            total_refunds=Sum('amount_paise', filter=Q(type='REFUND')),
            total_debits=Sum('amount_paise', filter=Q(type='DEBIT'))
        )
        opening_bal = 0 # In a real app, this would be balance at start_date
        closing_bal = merchant.available_balance_paise + merchant.held_balance_paise

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=50, bottomMargin=50)
        elements = []
        styles = getSampleStyleSheet()

        # Custom Styles
        title_style = ParagraphStyle('MainTitle', parent=styles['Heading1'], fontSize=22, textColor=colors.HexColor("#111827"), spaceAfter=2, fontName='Helvetica-Bold')
        subtitle_style = ParagraphStyle('SubTitle', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor("#6B7280"), spaceAfter=25, letterSpacing=1)
        section_title = ParagraphStyle('SectionTitle', parent=styles['Heading2'], fontSize=11, textColor=colors.HexColor("#111827"), spaceBefore=20, spaceAfter=12, fontName='Helvetica-Bold', borderPadding=5, letterSpacing=0.5)
        card_label = ParagraphStyle('CardLabel', fontSize=7, textColor=colors.HexColor("#9CA3AF"), alignment=1, fontName='Helvetica-Bold')
        card_value = ParagraphStyle('CardValue', fontSize=15, textColor=colors.HexColor("#111827"), fontName='Helvetica-Bold', alignment=1)

        # --- BRANDING & HEADER ---
        # Fixed logo positioning and character encoding (using INR instead of symbol)
        
        logo_data = [[
            Paragraph("PLAYTO PAY", title_style),
            Drawing(40, 40) # Placeholder for logo drawing
        ]]
        
        # Redraw Logo Drawing properly
        logo_drawing = Drawing(40, 40)
        logo_drawing.add(Rect(0, 5, 30, 30, fillColor=colors.HexColor("#10B981"), strokeColor=None, rx=6, ry=6))
        logo_drawing.add(Rect(7, 12, 16, 16, fillColor=colors.white, strokeColor=None, rx=3, ry=3))
        
        header_top_data = [
            [Paragraph("PLAYTO PAY", title_style), logo_drawing]
        ]
        header_top_table = Table(header_top_data, colWidths=[6*inch, 1*inch])
        header_top_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('ALIGN', (1, 0), (1, 0), 'RIGHT')]))
        elements.append(header_top_table)
        elements.append(Paragraph("OFFICIAL FINANCIAL SETTLEMENT STATEMENT", subtitle_style))
        
        # Top-right contact block using a table
        contact_data = [[
            Paragraph(f"<font color='#9CA3AF'>ISSUED TO</font><br/><b>{merchant.name}</b><br/>{merchant.email}<br/>MID: {merchant.id}", styles['Normal']),
            Paragraph(f"<font color='#9CA3AF'>DETAILS</font><br/><b>Statement:</b> #{str(uuid.uuid4())[:8].upper()}<br/><b>Date:</b> {timezone.now().strftime('%d %b %Y')}<br/><b>Currency:</b> INR", styles['Normal'])
        ]]
        contact_table = Table(contact_data, colWidths=[4*inch, 3*inch])
        contact_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('ALIGN', (1, 0), (1, 0), 'RIGHT')]))
        elements.append(contact_table)
        elements.append(Spacer(1, 25))

        # --- EXECUTIVE SUMMARY (CARDS) ---
        elements.append(Paragraph("EXECUTIVE SUMMARY", section_title))
        
        # Styled Cards with better spacing and using 'INR' text
        summary_cards = [
            [
                [Paragraph("TOTAL REQUESTS", card_label), Spacer(1, 4), Paragraph(str(stats['total_requests']), card_value)],
                [Paragraph("SETTLED AMOUNT", card_label), Spacer(1, 4), Paragraph(f"INR {(stats['success_amount'] or 0)/100:,.2f}", card_value)],
                [Paragraph("SUCCESS RATE", card_label), Spacer(1, 4), Paragraph(f"{success_rate:.1f}%", card_value)]
            ],
            [
                [Paragraph("AVG SETTLEMENT", card_label), Spacer(1, 4), Paragraph(f"INR {(stats['avg_payout'] or 0)/100:,.0f}", card_value)],
                [Paragraph("FAILED / REJECTED", card_label), Spacer(1, 4), Paragraph(f"INR {(stats['failed_amount'] or 0)/100:,.2f}", card_value)],
                [Paragraph("ESCROW / PENDING", card_label), Spacer(1, 4), Paragraph(f"INR {(stats['pending_amount'] or 0)/100:,.2f}", card_value)]
            ]
        ]
        
        for row in summary_cards:
            t = Table([row], colWidths=[2.33*inch, 2.33*inch, 2.33*inch])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FBFBFE")),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#EDF2F7")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EDF2F7")),
                ('TOPPADDING', (0, 0), (-1, -1), 15),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ]))
            elements.append(t)
            elements.append(Spacer(1, 10))

        # --- RECONCILIATION ---
        elements.append(Paragraph("WALLET RECONCILIATION", section_title))
        recon_data = [
            ["NARRATIVE", "CREDITS (INR)", "DEBITS (INR)", "BALANCE (INR)"],
            ["Opening Balance", "0.00", "-", "0.00"],
            ["Total Platform Inflow", f"{(ledger_stats['total_credits'] or 0)/100:,.2f}", "-", ""],
            ["Refunds & Restorations", f"{(ledger_stats['total_refunds'] or 0)/100:,.2f}", "-", ""],
            ["Successful Settlements", "-", f"{(ledger_stats['total_debits'] or 0)/100:,.2f}", ""],
            ["Closing Position", "", "", f"{(closing_bal/100):,.2f}"],
        ]
        recon_table = Table(recon_data, colWidths=[3.7*inch, 1.1*inch, 1.1*inch, 1.1*inch])
        recon_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1F2937")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#ECFDF5")),
        ]))
        elements.append(recon_table)
        elements.append(Spacer(1, 30))

        # --- TRANSACTION TABLE ---
        elements.append(Paragraph("TRANSACTION LEDGER", section_title))
        
        tx_data = [['DATE', 'REFERENCE', 'DESTINATION', 'ACCOUNT', 'AMOUNT', 'STATUS']]
        for p in payouts[:100]:
            status_hex = "#10B981" if p.status == 'completed' else "#EF4444" if p.status == 'failed' else "#F59E0B" if p.status == 'processing' else "#3B82F6"
            tx_data.append([
                p.created_at.strftime('%d/%m/%y'),
                str(p.id)[:10].upper(),
                p.bank_account.bank_name[:18],
                f"**{p.bank_account.account_number[-4:]}",
                f"{p.amount_paise / 100:,.2f}",
                Paragraph(f"<font color='{status_hex}' size='8'><b>{p.status.upper()}</b></font>", styles['Normal'])
            ])
            
        t = Table(tx_data, colWidths=[0.9*inch, 1.1*inch, 1.8*inch, 0.9*inch, 1.1*inch, 1.2*inch], repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#374151")),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (4, 0), (4, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LINEBELOW', (0, 0), (-1, 0), 1.5, colors.HexColor("#10B981")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
            ('LINEBELOW', (0, 1), (-1, -2), 0.1, colors.HexColor("#E5E7EB")),
        ]))
        elements.append(t)

        # --- FOOTER ---
        def add_footer(canvas, doc):
            canvas.saveState()
            canvas.setFont('Helvetica', 8)
            canvas.setStrokeColor(colors.lightgrey)
            canvas.line(40, 40, A4[0]-40, 40)
            footer_text = "This statement is system generated by Playto Pay and does not require signature."
            canvas.drawCentredString(A4[0]/2, 25, footer_text)
            canvas.drawCentredString(A4[0]/2, 12, "Playto Pay – Secure Cross-Border Payment Infrastructure. Support: support@playto.so")
            canvas.drawRightString(A4[0]-40, 25, f"Page {doc.page}")
            canvas.restoreState()

        doc.build(elements, onFirstPage=add_footer, onLaterPages=add_footer)
        
        pdf = buffer.getvalue()
        buffer.close()
        
        safe_name = merchant.name.replace(" ", "_")
        month = timezone.now().strftime('%B')
        year = timezone.now().strftime('%Y')
        filename = f"PlaytoPay_MerchantReport_{safe_name}_{month}_{year}.pdf"
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response.write(pdf)
        
        return response

class LedgerViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LedgerEntrySerializer
    
    def get_queryset(self):
        return LedgerEntry.objects.filter(merchant=self.request.user.merchant).order_by('-created_at')


class TopUpView(views.APIView):
    def post(self, request):
        amount_paise = request.data.get('amount_paise', 0)
        if not amount_paise or amount_paise <= 0:
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)
            
        merchant = request.user.merchant
        with transaction.atomic():
            merchant = Merchant.objects.select_for_update().get(id=merchant.id)
            merchant.available_balance_paise += amount_paise
            merchant.save()
            
            LedgerEntry.objects.create(
                merchant=merchant,
                type='CREDIT',
                amount_paise=amount_paise,
                reference_id=f"topup_{int(time.time())}"
            )
            
        try:
            html_content = render_to_string('emails/topup.html', {
                'merchant_name': merchant.name,
                'amount_inr': f"{amount_paise / 100:.2f}",
                'new_balance_inr': f"{merchant.available_balance_paise / 100:.2f}",
                'dashboard_url': f"{settings.FRONTEND_URL}/dashboard"
            })
            send_mail(
                subject='Test Funding Added - Playto Pay',
                message=f'Test funding of INR {amount_paise / 100:.2f} has been successfully added.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[merchant.email],
                html_message=html_content,
                fail_silently=True,
            )
        except Exception as e:
            print(f"Failed to send email: {e}")
            
        return Response({'message': 'Balance added successfully', 'new_balance': merchant.available_balance_paise})
