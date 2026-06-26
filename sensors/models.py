from django.db import models

class Sensor(models.Model):
    name = models.CharField(max_length=100, blank=True)
    topic = models.CharField(max_length=200, unique=True)
    unit = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return self.name or self.topic


class SensorReading(models.Model):
    # 這裡明確告訴 Django，資料庫底層的欄位名稱叫 'sensor_id'
    sensor = models.ForeignKey(Sensor, on_delete=models.CASCADE, related_name='readings', db_column='sensor_id')
    value = models.TextField() # 剛剛改好的 TextField
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        db_table = 'sensors_sensorreading' # 確保這是你 phpMyAdmin 裡的真實表名

    def __str__(self):
        return f"{self.sensor} {self.value} @ {self.timestamp}"
