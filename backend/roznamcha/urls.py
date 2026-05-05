from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RozNamchaViewSet

router = DefaultRouter()
router.register(r'roznamcha', RozNamchaViewSet, basename='roznamcha')

urlpatterns = [
    path('', include(router.urls)),
]
