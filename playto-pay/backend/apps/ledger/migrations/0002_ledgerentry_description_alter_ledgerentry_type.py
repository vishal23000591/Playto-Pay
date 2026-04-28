

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ledger', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='ledgerentry',
            name='description',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='ledgerentry',
            name='type',
            field=models.CharField(choices=[('CREDIT', 'Credit'), ('DEBIT', 'Debit'), ('HOLD', 'Hold'), ('RELEASE', 'Release'), ('REFUND', 'Refund')], max_length=10),
        ),
    ]