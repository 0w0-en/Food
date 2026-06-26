from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from .models import Sensor, SensorReading
from django.core.paginator import Paginator
from django.views.decorators.http import require_GET
from django.db import connection
from django.utils.dateparse import parse_datetime


def index(request):
    sensors = Sensor.objects.all()
    return render(request, 'sensors/index.html', {'sensors': sensors})


@require_GET
def api_latest(request):
    try:
        data = []
        for s in Sensor.objects.all():
            latest = s.readings.first()
            if latest:
                data.append({'sensor_id': s.id, 'name': s.name or s.topic, 'unit': s.unit, 'value': latest.value, 'timestamp': latest.timestamp})
        return JsonResponse({'results': data})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_GET
def api_history(request):
    try:
        sensor_id = request.GET.get('sensor_id')
        limit = int(request.GET.get('limit', 100))
        sensor = get_object_or_404(Sensor, id=sensor_id)
        readings = sensor.readings.all()[:limit]
        data = [{'value': r.value, 'timestamp': r.timestamp} for r in reversed(readings)]
        return JsonResponse({'sensor': sensor.id, 'data': data})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_GET
def api_raw(request):
    try:
        sensor_id = request.GET.get('sensor_id')
        sensor = get_object_or_404(Sensor, id=sensor_id)
        # 這裡改成回傳 sensor.topic
        rows = [{
            'id': r.id, 
            'topic': sensor.topic,  # 確保這裡抓取到 Topic
            'value': r.value, 
            'timestamp': r.timestamp.strftime('%Y-%m-%d %H:%M:%S') 
        } for r in sensor.readings.all()[:50]]
        
        return JsonResponse({'results': rows})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)



