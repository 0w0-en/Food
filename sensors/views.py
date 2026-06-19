from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from .models import Sensor, SensorReading
from django.core.paginator import Paginator
from django.views.decorators.http import require_GET


def index(request):
    sensors = Sensor.objects.all()
    return render(request, 'sensors/index.html', {'sensors': sensors})


@require_GET
def api_latest(request):
    data = []
    for s in Sensor.objects.all():
        latest = s.readings.first()
        if latest:
            data.append({'sensor_id': s.id, 'name': s.name or s.topic, 'unit': s.unit, 'value': latest.value, 'timestamp': latest.timestamp})
    return JsonResponse({'results': data})


@require_GET
def api_history(request):
    sensor_id = request.GET.get('sensor_id')
    limit = int(request.GET.get('limit', 100))
    sensor = get_object_or_404(Sensor, id=sensor_id)
    readings = sensor.readings.all()[:limit]
    data = [{'value': r.value, 'timestamp': r.timestamp} for r in reversed(readings)]
    return JsonResponse({'sensor': sensor.id, 'data': data})


@require_GET
def api_raw(request):
    sensor_id = request.GET.get('sensor_id')
    page = int(request.GET.get('page', 1))
    per = int(request.GET.get('per', 25))
    sensor = get_object_or_404(Sensor, id=sensor_id)
    qs = sensor.readings.all()
    paginator = Paginator(qs, per)
    p = paginator.get_page(page)
    rows = [{'id': r.id, 'value': r.value, 'timestamp': r.timestamp} for r in p]
    return JsonResponse({'results': rows, 'page': p.number, 'num_pages': paginator.num_pages})
