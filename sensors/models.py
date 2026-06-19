from django.db import models


class Sensor(models.Model):
    name = models.CharField(max_length=100, blank=True)
    topic = models.CharField(max_length=200, unique=True)
    unit = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return self.name or self.topic


class SensorReading(models.Model):
    sensor = models.ForeignKey(Sensor, on_delete=models.CASCADE, related_name='readings')
    value = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.sensor} {self.value} @ {self.timestamp}"
