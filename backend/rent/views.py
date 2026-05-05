from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import RentPayment, Shop
from .serializers import RentPaymentSerializer, ShopSerializer


class ShopViewSet(viewsets.ModelViewSet):
    queryset = Shop.objects.prefetch_related("payments").all()
    serializer_class = ShopSerializer
    permission_classes = [AllowAny]

    @action(detail=True, methods=["post"])
    def add_payment(self, request, pk=None):
        shop = self.get_object()
        serializer = RentPaymentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(shop=shop)
            # Refetch so nested payments (incl. note) are not stale from prefetch cache
            shop = Shop.objects.prefetch_related("payments").get(pk=shop.pk)
            return Response(
                {"message": "Payment added", "shop": ShopSerializer(shop).data},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["patch", "delete"], url_path=r"payments/(?P<payment_id>[^/.]+)")
    def payment(self, request, pk=None, payment_id=None):
        shop = self.get_object()
        payment = get_object_or_404(RentPayment, pk=payment_id, shop=shop)

        if request.method.lower() == "patch":
            serializer = RentPaymentSerializer(payment, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                shop = Shop.objects.prefetch_related("payments").get(pk=shop.pk)
                return Response(
                    {"message": "Payment updated", "shop": ShopSerializer(shop).data},
                    status=status.HTTP_200_OK,
                )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        payment.delete()
        shop = Shop.objects.prefetch_related("payments").get(pk=shop.pk)
        return Response(
            {"message": "Payment deleted", "shop": ShopSerializer(shop).data},
            status=status.HTTP_200_OK,
        )
