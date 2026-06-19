from django.urls import path
from . import views

app_name = 'sensors'

urlpatterns = [
    path('', views.index, name='index'),
    path('api/latest/', views.api_latest, name='api_latest'),
    path('api/history/', views.api_history, name='api_history'),
    path('api/raw/', views.api_raw, name='api_raw'),
    path('api/pi-data/', views.api_pi_data, name='api_pi_data'),
]
