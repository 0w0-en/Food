# IoT Personal Site (赵翌雯 B11313121)

This is a Django project scaffold for an IoT personal website. It stores sensor readings in MySQL and receives data from an MQTT broker.

Quick start (Windows):

1. Create virtualenv and install deps

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Copy `.env.example` to `.env` and edit DB/MQTT settings.

3. Create MySQL database (example):

```sql
CREATE DATABASE iot_wenweb_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

4. Run migrations and start server on port 8002:

```powershell
python manage.py migrate
python manage.py runserver 0.0.0.0:8002
```

Notes:
- Do not commit `.env` to git.
- To deploy on Raspberry Pi, change `DB_HOST` and `MQTT_BROKER` as needed and run with Gunicorn + Nginx.
