import threading

_local = threading.local()

def set_current_user(user):
    """Set the current user in thread-local storage"""
    _local.user = user

def get_current_user():
    """Get the current user from thread-local storage"""
    return getattr(_local, 'user', None)

def clear_current_user():
    """Clear the current user from thread-local storage"""
    if hasattr(_local, 'user'):
        delattr(_local, 'user')