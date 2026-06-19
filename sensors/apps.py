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

        def on_message(client, userdata, msg):
            try:
                payload = msg.payload.decode()
                # try parse float, else ignore
                try:
                    value = float(payload)
                except Exception:
                    # try JSON with value
                    import json
                    j = json.loads(payload)
                    value = float(j.get('value'))

                close_old_connections()
                sensor, _ = Sensor.objects.get_or_create(topic=msg.topic, defaults={'name': msg.topic})
                SensorReading.objects.create(sensor=sensor, value=value)
            except Exception:
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
