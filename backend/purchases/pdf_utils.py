from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib import colors
from io import BytesIO
from datetime import datetime
from django.db.models import Sum


def generate_supplier_ledger_pdf(supplier, purchases, statuses=None):
    """Generate detailed supplier ledger PDF report filtered by status"""
    if statuses:
        purchases = purchases.filter(payment_status__in=statuses)
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=6,
        alignment=1
    )
    elements.append(Paragraph(f"Supplier Ledger Report", title_style))
    elements.append(Spacer(1, 0.1*inch))
    
    # Supplier Info
    info_style = ParagraphStyle(
        'Info',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#4b5563')
    )
    elements.append(Paragraph(f"<b>Supplier:</b> {supplier.name}", info_style))
    elements.append(Paragraph(f"<b>Contact:</b> {supplier.contact_person} | <b>Phone:</b> {supplier.phone}", info_style))
    elements.append(Paragraph(f"<b>Email:</b> {supplier.email} | <b>Address:</b> {supplier.address}", info_style))
    elements.append(Paragraph(f"<b>Report Date:</b> {datetime.now().strftime('%B %d, %Y')}", info_style))
    elements.append(Spacer(1, 0.15*inch))
    
    # Summary Cards
    total_purchases = sum(float(p.cost) for p in purchases)
    total_paid = sum(float(p.total_paid) for p in purchases)
    total_due = sum(float(p.remaining_amount) for p in purchases)
    
    summary_data = [
        ['Total Purchases', f"AFN {total_purchases:,.2f}"],
        ['Total Paid', f"AFN {total_paid:,.2f}"],
        ['Total Due', f"AFN {total_due:,.2f}"]
    ]
    
    summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
        ('BACKGROUND', (1, 0), (1, -1), colors.HexColor('#f9fafb')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1f2937')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb'))
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # Purchase Details Table
    table_data = [['Item', 'Quantity', 'Cost', 'Paid', 'Due', 'Status', 'Date']]
    
    for purchase in purchases:
        status_text = purchase.payment_status.upper()
        date_str = purchase.purchase_date.strftime('%m/%d/%Y')
        table_data.append([
            purchase.item_name[:20],
            str(purchase.quantity),
            f"AFN {float(purchase.cost):,.2f}",
            f"AFN {float(purchase.total_paid):,.2f}",
            f"AFN {float(purchase.remaining_amount):,.2f}",
            status_text,
            date_str
        ])
    
    table = Table(table_data, colWidths=[1.2*inch, 0.8*inch, 0.9*inch, 0.9*inch, 0.9*inch, 0.8*inch, 0.8*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')])
    ]))
    elements.append(table)
    
    doc.build(elements)
    buffer.seek(0)
    return buffer
