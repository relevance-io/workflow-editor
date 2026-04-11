import json
from typing import Type

from django.contrib import admin
from django.contrib.admin.views.decorators import staff_member_required
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.urls import path, reverse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_GET, require_POST

from relevanceio.workflow_editor import DiagramEditor

from .admin import WorkflowAdmin
from .models import BaseWorkflow, SimpleWorkflow


class WorkflowViewSet:
    """
    Registers editor + save views for a BaseWorkflow subclass under a given
    URL namespace.

    Admin registration is intentionally left to the caller. Use
    build_admin_class() to get a concrete WorkflowAdmin subclass with the
    correct editor URL already wired, then pass it to admin.site.register():

        viewset = WorkflowViewSet(model=MyWorkflow, app_name='myapp')

        # in admin.py:
        admin.site.register(MyWorkflow, viewset.build_admin_class())

    Parameters
    ----------
    model:
        A concrete subclass of BaseWorkflow.
    app_name:
        The namespace this viewset's URLs will be registered under.
        Must match the app_name of the including urlconf.
    url_prefix:
        Path prefix for the generated URL patterns (no leading/trailing slash).
        Defaults to 'workflows'.
    workflow_name_attr:
        Attribute on the model instance used as the display name in the
        breadcrumb and editor template. Defaults to 'title'.
    """

    def __init__(
        self,
        *,
        model: Type[BaseWorkflow],
        app_name: str,
        url_prefix: str = 'workflows',
        workflow_name_attr: str = 'title',
    ) -> None:
        self.model = model
        self.app_name = app_name
        self.url_prefix = url_prefix.strip('/')
        self.workflow_name_attr = workflow_name_attr

    # ── Admin helper ─────────────────────────────────────────────────────────────────────────────

    def build_admin_class(self) -> Type[WorkflowAdmin]:
        """
        Return a concrete WorkflowAdmin subclass with get_editor_url()
        implemented for this viewset's namespace.

        Pass the result to admin.site.register() in your admin.py:

            admin.site.register(MyWorkflow, viewset.build_admin_class())
        """
        editor_url_name = f'{self.app_name}:editor'
        workflow_name_attr = self.workflow_name_attr

        return type(
            f'{self.model.__name__}Admin',
            (WorkflowAdmin,),
            {
                'list_display': (
                    workflow_name_attr,
                    '_node_count',
                    '_edge_count',
                    '_editor_link',
                ),
                'readonly_fields': ('_editor_link',),
                'fields': (workflow_name_attr, '_editor_link'),
                'get_editor_url': lambda self_admin, obj: reverse(
                    editor_url_name,
                    kwargs={'pk': obj.pk},
                ),
            },
        )

    # ── URL helpers ────────────────────────────────────────────────────────────────────────────

    @property
    def editor_url_name(self) -> str:
        return f'{self.app_name}:editor'

    @property
    def save_url_name(self) -> str:
        return f'{self.app_name}:save'

    @property
    def urls(self) -> list:
        """URL patterns to splice into a urlconf that carries app_name=self.app_name."""
        return [
            path(
                f'{self.url_prefix}/<int:pk>/editor/',
                self._editor_view,
                name='editor',
            ),
            path(
                f'{self.url_prefix}/<int:pk>/save/',
                self._save_view,
                name='save',
            ),
        ]

    # ── Hooks for subclasses ─────────────────────────────────────────────────────────────────────

    def get_workflow_name(self, obj: BaseWorkflow) -> str:
        return str(getattr(obj, self.workflow_name_attr, obj))

    def get_workflow_contents(self, obj: BaseWorkflow) -> dict:
        return obj.workflow_contents or {}

    def save_workflow_contents(self, obj: BaseWorkflow, diagram: dict) -> None:
        obj.workflow_contents = diagram
        obj.save(update_fields=['workflow_contents'])

    def build_editor(self) -> DiagramEditor:
        """Override to register custom node types."""
        editor = DiagramEditor()
        editor.register_builtin_nodes()
        return editor

    # ── Internal views ──────────────────────────────────────────────────────────────────────────

    @property
    def _editor_view(self):
        viewset = self

        @staff_member_required
        @require_GET
        def editor_view(request: HttpRequest, pk: int):
            obj = get_object_or_404(viewset.model, pk=pk)

            editor = viewset.build_editor()
            diagram = viewset.get_workflow_contents(obj)

            if diagram.get('nodes'):
                editor.deserialize(diagram)

            editor_html: str = editor.render(width='100%', height='100%')
            post_url: str = reverse(viewset.save_url_name, kwargs={'pk': pk})

            return render(request, 'admin/workflow_editor.html', {
                'editor_html': editor_html,
                'post_url': post_url,
                'title': 'Workflow Editor',
                'has_permission': True,
                'opts': viewset.model._meta,
                'workflow': obj,
                'workflow_name': viewset.get_workflow_name(obj),
            })

        return editor_view

    @property
    def _save_view(self):
        viewset = self

        @staff_member_required
        @csrf_protect
        @require_POST
        def save_view(request: HttpRequest, pk: int):
            obj = get_object_or_404(viewset.model, pk=pk)

            try:
                diagram: dict = json.loads(request.body)
            except json.JSONDecodeError as exc:
                return JsonResponse({'error': f'Invalid JSON: {exc}'}, status=400)

            if (
                not isinstance(diagram.get('nodes'), list)
                or not isinstance(diagram.get('edges'), list)
            ):
                return JsonResponse(
                    {'error': "Payload must contain 'nodes' and 'edges' arrays."},
                    status=400,
                )

            viewset.save_workflow_contents(obj, diagram)

            return JsonResponse({
                'status': 'ok',
                'nodes': len(diagram['nodes']),
                'edges': len(diagram['edges']),
            })

        return save_view


class SimpleWorkflowViewSet(WorkflowViewSet):
    """
    Ready-to-use WorkflowViewSet wired to SimpleWorkflow.

    The app_name must match the namespace the including urlconf declares.

    Admin registration is not automatic. In your admin.py:

        from django.contrib import admin
        from relevanceio.workflow_editor.django.views import SimpleWorkflowViewSet
        from relevanceio.workflow_editor.django.models import SimpleWorkflow

        _viewset = SimpleWorkflowViewSet(app_name='myapp')
        admin.site.register(SimpleWorkflow, _viewset.build_admin_class())
    """

    def __init__(self, *, app_name: str) -> None:
        super().__init__(
            model=SimpleWorkflow,
            app_name=app_name,
            url_prefix='workflows',
            workflow_name_attr='title',
        )
