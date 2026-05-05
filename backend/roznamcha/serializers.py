from rest_framework import serializers
from .models import RozNamcha


class RozNamchaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RozNamcha
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
