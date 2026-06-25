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


# ================= 新增的 Pi 資料表模型 =================
class PiData(models.Model):
    # 請根據你 phpMyAdmin 裡 pi 資料表的實際欄位名稱調整 db_column
    id = models.AutoField(primary_key=True, db_column='id') 
    value = models.FloatField(db_column='value')           
    timestamp = models.DateTimeField(db_column='timestamp') 

    class Meta:
        managed = False       # 告訴 Django 唯讀，不要去更動或建立這個資料表結構
        db_table = 'pi'       # 對應 phpMyAdmin 的 pi 資料表名稱

    def __str__(self):
        return f"[{self.timestamp}] Pi Value: {self.value}"