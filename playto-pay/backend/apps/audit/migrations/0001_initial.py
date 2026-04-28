

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('merchants', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('LOGIN', 'Login'), ('LOGOUT', 'Logout'), ('PAYOUT_REQUEST', 'Payout Request'), ('PAYOUT_COMPLETE', 'Payout Complete'), ('PAYOUT_FAIL', 'Payout Fail'), ('BANK_ADD', 'Bank Added'), ('BANK_DELETE', 'Bank Deleted'), ('BALANCE_TOPUP', 'Balance Topup')], max_length=50)),
                ('resource_type', models.CharField(max_length=50)),
                ('resource_id', models.CharField(blank=True, max_length=255, null=True)),
                ('description', models.TextField()),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('merchant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='audit_logs', to='merchants.merchant')),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]