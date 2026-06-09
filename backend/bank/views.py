from decimal import Decimal
from django.db.models import Sum
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import BankTransaction
from .serializers import BankTransactionSerializer, income_total_confirmed


class BankTransactionViewSet(viewsets.ModelViewSet):
    queryset = BankTransaction.objects.all()
    serializer_class = BankTransactionSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    @action(detail=False, methods=['get'])
    def summary(self, request):
        total_deposit = self.queryset.filter(transaction_type=BankTransaction.TYPE_DEPOSIT).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        total_withdraw = self.queryset.filter(transaction_type=BankTransaction.TYPE_WITHDRAW).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        income_deposited = self.queryset.filter(
            transaction_type=BankTransaction.TYPE_DEPOSIT,
            source=BankTransaction.SOURCE_INCOME
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        income_total = income_total_confirmed()
        income_available = max(Decimal('0'), income_total - income_deposited)

        return Response({
            'current_balance': str(BankTransaction.current_balance()),
            'total_deposit': str(total_deposit),
            'total_withdraw': str(total_withdraw),
            'income_total': str(income_total),
            'income_deposited': str(income_deposited),
            'income_available': str(income_available),
            'count': self.queryset.count(),
        })

    @action(detail=False, methods=['post'])
    def deposit_income(self, request):
        amount_raw = request.data.get('amount')
        note = request.data.get('note', '')

        income_total = income_total_confirmed()
        income_deposited = self.queryset.filter(
            transaction_type=BankTransaction.TYPE_DEPOSIT,
            source=BankTransaction.SOURCE_INCOME
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        income_available = max(Decimal('0'), income_total - income_deposited)

        if amount_raw in (None, ''):
            amount = income_available
        else:
            try:
                amount = Decimal(str(amount_raw))
            except Exception:
                return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return Response({'error': 'No income available to deposit'}, status=status.HTTP_400_BAD_REQUEST)
        if amount > income_available:
            return Response(
                {'error': f'Cannot deposit more than available income ({income_available})'},
                status=status.HTTP_400_BAD_REQUEST
            )

        tx = BankTransaction.objects.create(
            transaction_type=BankTransaction.TYPE_DEPOSIT,
            source=BankTransaction.SOURCE_INCOME,
            amount=amount,
            note=note or 'Income deposit'
        )
        return Response(BankTransactionSerializer(tx).data, status=status.HTTP_201_CREATED)

