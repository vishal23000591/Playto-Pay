

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('merchants', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='WebhookEndpoint',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('url', models.URLField()),
                ('secret', models.CharField(default=uuid.uuid4, max_length=255)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('merchant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='webhook_endpoints', to='merchants.merchant')),
            ],
        ),
        migrations.CreateModel(
            name='WebhookEvent',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('event_type', models.CharField(max_length=100)),
                ('payload', models.JSONField()),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('sent', 'Sent'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('attempts', models.IntegerField(default=0)),
                ('last_attempt_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('endpoint', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='events', to='webhooks.webhookendpoint')),
            ],
        ),
    ]