from .models import AuditLog
from .context import set_current_user, clear_current_user

class AuditLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Set current user for signals
        if request.user.is_authenticated:
            set_current_user(request.user)
        
        try:
            response = self.get_response(request)
            
            if request.user.is_authenticated and request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
                AuditLog.objects.create(
                    user=request.user,
                    action=f"{request.method} {request.path}",
                    ip_address=self.get_client_ip(request),
                    details={'status_code': response.status_code}
                )
            
            return response
        finally:
            # Always clear user context after request
            clear_current_user()
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')
