from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/latest/', views.api_latest, name='api_latest'),
    path('api/history/', views.api_history, name='api_history'),
    path('api/raw/', views.api_raw, name='api_raw'),
    # 這裡絕對不要有 path('api/pi-data/', ...) 這一行！
]