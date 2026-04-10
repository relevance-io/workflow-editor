from django.contrib import admin
from django.utils.html import format_html


class WorkflowAdmin(admin.ModelAdmin):
    """
    Base admin class for BaseWorkflow subclasses.

    Do not instantiate or register directly. Use WorkflowViewSet.build_admin_class()
    to get a concrete subclass with get_editor_url() already implemented, then
    pass it to admin.site.register() in your admin.py.
    """

    @admin.display(description='Nodes')
    def _node_count(self, obj) -> int:
        return len((obj.workflow_contents or {}).get('nodes', []))

    @admin.display(description='Edges')
    def _edge_count(self, obj) -> int:
        return len((obj.workflow_contents or {}).get('edges', []))

    @admin.display(description='Diagram editor')
    def _editor_link(self, obj) -> str:
        if not obj.pk:
            return '(save the workflow first)'

        url = self.get_editor_url(obj)
        return format_html('<a class="button" href="{}">&#9998; Edit Diagram</a>', url)

    def get_editor_url(self, obj) -> str:
        """Implemented by the class produced by WorkflowViewSet.build_admin_class()."""
        raise NotImplementedError(
            f'{self.__class__.__name__} must implement get_editor_url()'
        )
