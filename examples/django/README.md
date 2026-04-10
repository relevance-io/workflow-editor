# workflow-editor — Django example

A minimal Django project that demonstrates the `relevanceio.workflow_editor.django` package.

## Quick start

```bash
cd examples/django

python -m venv .venv
source .venv/bin/activate       # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt

python manage.py migrate
python manage.py createsuperuser
python manage.py seed_workflows  # optional — loads three sample diagrams

python manage.py runserver
```

Open <http://127.0.0.1:8000/admin/> → **Workflows → any row → Edit Diagram**.
