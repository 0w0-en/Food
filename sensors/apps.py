from django.apps import AppConfig
import threading
import os


class SensorsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'sensors'

    def ready(self):
        # Prevent running the MQTT client twice with autoreload
        if os.environ.get('RUN_MAIN') != 'true':
            return

        from django.conf import settings
        from django.db import close_old_connections
        import paho.mqtt.client as mqtt
        from .models import Sensor, SensorReading

        broker = settings.MQTT_BROKER
        port = settings.MQTT_PORT
        topics = settings.MQTT_TOPICS

        def on_connect(client, userdata, flags, rc):
            for t in topics:
                client.subscribe(t)

        # apps.py -> 修改 on_message 函式
        def on_message(client, userdata, msg):
        try:
            # 直接讀取 payload 字串
            payload = msg.payload.decode()
        
            close_old_connections()
            # 建立感測器記錄
            sensor, _ = Sensor.objects.get_or_create(topic=msg.topic, defaults={'name': msg.topic})
        
            # 直接把 payload 塞進去 (value 欄位現在是 TextField)
            SensorReading.objects.create(sensor=sensor, value=payload)
        
        except Exception as e:
            print(f"❌ 錯誤: {e}")
            return

        def mqtt_thread():
            client = mqtt.Client()
            client.on_connect = on_connect
            client.on_message = on_message
            try:
                client.connect(broker, port, 60)
                client.loop_forever()
            except Exception:
                return

        t = threading.Thread(target=mqtt_thread, daemon=True)
        t.start()
