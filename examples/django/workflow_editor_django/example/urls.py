from django.urls import path

from . import views

app_name = 'workflow_editor_django.example'

urlpatterns = [
    path('<int:pk>/editor/', views.workflow_editor_view, name='editor'),
    path('<int:pk>/save/', views.workflow_save_view, name='save'),
]
