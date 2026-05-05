from django.contrib import admin
from .models import PrintingPrinter, PrintingJob, PrintingJobItem, PrintingPayment

admin.site.register(PrintingPrinter)
admin.site.register(PrintingJob)
admin.site.register(PrintingJobItem)
admin.site.register(PrintingPayment)

