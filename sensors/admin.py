from django.contrib import admin
from .models import Sensor, SensorReading


@admin.register(Sensor)
class SensorAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'topic', 'unit')


@admin.register(SensorReading)
class SensorReadingAdmin(admin.ModelAdmin):
    list_display = ('id', 'sensor', 'value', 'timestamp')
    list_filter = ('sensor',)
