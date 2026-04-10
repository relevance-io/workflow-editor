import json

from django.contrib.admin.views.decorators import staff_member_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.urls import reverse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_GET, require_POST

from relevanceio.workflow_editor import DiagramEditor

from .models import Workflow


@staff_member_required
@require_GET
def workflow_editor_view(request, pk: int):
    """
    Load the Workflow instance, restore its diagram into a DiagramEditor,
    call render() to produce the self-contained iframe HTML, and pass it
    to the template together with the save URL.
    """
    workflow = get_object_or_404(Workflow, pk=pk)

    editor = DiagramEditor()
    editor.register_builtin_nodes()

    if workflow.diagram:
        editor.deserialize(workflow.diagram)

    editor_html: str = editor.render(width='100%', height='100%')
    post_url: str = reverse('workflow_editor_django.example:save', kwargs={'pk': pk})

    return render(request, 'admin/workflow_editor.html', {
        'editor_html': editor_html,
        'post_url': post_url,
        'title': f'Edit Workflow — {workflow.name}',
        'has_permission': True,
    })


@staff_member_required
@csrf_protect
@require_POST
def workflow_save_view(request, pk: int):
    """
    Parse the JSON body posted by the iframe bridge and persist it to the
    Workflow.diagram JSONField.
    """
    workflow = get_object_or_404(Workflow, pk=pk)

    try:
        diagram: dict = json.loads(request.body)
    except json.JSONDecodeError as exc:
        return JsonResponse({'error': f'Invalid JSON: {exc}'}, status=400)

    if not isinstance(diagram.get('nodes'), list) or not isinstance(diagram.get('edges'), list):
        return JsonResponse(
            {'error': "Payload must contain 'nodes' and 'edges' arrays."},
            status=400,
        )

    workflow.diagram = diagram
    workflow.save(update_fields=['diagram', 'updated_at'])

    return JsonResponse({
        'status': 'ok',
        'nodes': len(diagram['nodes']),
        'edges': len(diagram['edges']),
    })
