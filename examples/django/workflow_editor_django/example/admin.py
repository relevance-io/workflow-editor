from django.contrib import admin

from relevanceio.workflow_editor.django.models import SimpleWorkflow
from relevanceio.workflow_editor.django.views import SimpleWorkflowViewSet

from .urls import _viewset

admin.site.register(SimpleWorkflow, _viewset.build_admin_class())
