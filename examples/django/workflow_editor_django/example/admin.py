from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html

from .models import Workflow


@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    list_display = ('name', 'node_count', 'edge_count', 'updated_at', 'editor_link')
    readonly_fields = ('created_at', 'updated_at', 'editor_link')
    fields = ('name', 'editor_link', 'created_at', 'updated_at')

    @admin.display(description='Nodes')
    def node_count(self, obj: Workflow) -> int:
        return len((obj.diagram or {}).get('nodes', []))

    @admin.display(description='Edges')
    def edge_count(self, obj: Workflow) -> int:
        return len((obj.diagram or {}).get('edges', []))

    @admin.display(description='Diagram editor')
    def editor_link(self, obj: Workflow) -> str:
        if not obj.pk:
            return '(save the workflow first)'
        url = reverse('workflow_editor_django.example:editor', kwargs={'pk': obj.pk})
        return format_html('<a class="button" href="{}">&#9998; Edit Diagram</a>', url)
