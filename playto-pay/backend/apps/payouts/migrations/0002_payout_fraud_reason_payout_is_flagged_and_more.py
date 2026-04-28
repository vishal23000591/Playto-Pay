

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payouts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='payout',
            name='fraud_reason',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='payout',
            name='is_flagged',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='payout',
            name='risk_score',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='payout',
            name='scheduled_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]