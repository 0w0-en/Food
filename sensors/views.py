from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from .models import Sensor, SensorReading, PiData
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
    """
    透過 iotsixgroup_db 讀取 phpMyAdmin 裡面的 pi 歷史資料
    """
    try:
        # 1. 使用 .using() 指定去連 iotsixgroup_db，抓最新 50 筆
        qs = PiData.objects.using('iotsixgroup_db').order_by('-id')[:50]
        
        # 2. 轉換成前端 JS 好讀的 JSON 格式
        rows = []
        for item in qs:
            rows.append({
                'id': item.id,
                'value': item.value,
                # 將 Datetime 轉成漂亮的時間字串，避免 JavaScript 解析失敗
                'timestamp': item.timestamp.strftime('%Y-%m-%d %H:%M:%S') if item.timestamp else ''
            })
            
        return JsonResponse({'results': rows})
    except Exception as e:
        return JsonResponse({'error': 'Could not read iotsixgroup.pi: %s' % str(e)}, status=500)
