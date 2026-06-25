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
        page = int(request.GET.get('page', 1))
        per = int(request.GET.get('per', 25))
        sensor = get_object_or_404(Sensor, id=sensor_id)
        qs = sensor.readings.all()
        paginator = Paginator(qs, per)
        p = paginator.get_page(page)
        rows = [{'id': r.id, 'value': r.value, 'timestamp': r.timestamp} for r in p]
        return JsonResponse({'results': rows, 'page': p.number, 'num_pages': paginator.num_pages})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_GET
def api_pi_data(request):
    """Attempt to read latest rows from `iotsixgroup.pi` table via default DB connection.
    Returns JSON list of rows with id, value, timestamp. If the table/db is not accessible,
    returns an error message.
    """
    try:
        with connection.cursor() as cur:
            cur.execute("SELECT id, value, timestamp FROM iotsixgroup.pi ORDER BY id DESC LIMIT 50")
            cols = [c[0] for c in cur.description]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]
        # normalize timestamps to ISO strings
        for r in rows:
            if isinstance(r.get('timestamp'), str):
                # assume already string
                pass
        return JsonResponse({'results': rows})
    except Exception as e:
        return JsonResponse({'error': 'Could not read iotsixgroup.pi: %s' % str(e)}, status=500)
