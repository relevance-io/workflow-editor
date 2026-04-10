"""
management command: python manage.py seed_workflows

Populates three sample Workflow rows so the editor can be opened on a
non-empty canvas straight away. Safe to run multiple times — existing
rows are left untouched.
"""
import json

from django.core.management.base import BaseCommand

from relevanceio.workflow_editor import (
    CircleNode,
    DiagramEditor,
    DiamondNode,
    EllipseNode,
    RectangleNode,
    define_node_type,
)

from examples.django.workflow_editor_django.example.models import Workflow


def _build_approval_pipeline() -> dict:
    editor = DiagramEditor()
    editor.register_builtin_nodes()

    TaskNode = define_node_type(
        RectangleNode,
        node_class_name='TaskNode',
        defaults={'label': 'Task', 'backgroundColor': '#e8f4fd'},
        schema={
            'assignee': {'label': 'Assignee', 'type': 'text', 'default': ''},
            'done': {'label': 'Done', 'type': 'boolean', 'default': False},
            'priority': {
                'label': 'Priority',
                'type': 'choice',
                'default': 'medium',
                'choices': {'low': 'Low', 'medium': 'Medium', 'high': 'High'},
            },
        },
        name='Task',
    )
    editor.register_node_type('TaskNode', TaskNode, 'Task')

    start = editor.add_node(EllipseNode('Start'), x=0, y=0)
    review = editor.add_node(TaskNode('Code Review'), x=200, y=0)
    decision = editor.add_node(DiamondNode('Approved?'), x=400, y=0)
    deploy = editor.add_node(TaskNode('Deploy'), x=600, y=0)
    end = editor.add_node(CircleNode('End'), x=800, y=0)

    review.set_custom_property('assignee', 'alice')
    review.set_custom_property('priority', 'high')
    deploy.set_custom_property('assignee', 'bob')

    editor.connect(start, review, label='begin')
    editor.connect(review, decision, label='submit')
    editor.connect(decision, deploy, label='yes', lineColor='#28a745')
    editor.connect(decision, review, label='no', lineColor='#dc3545', connectorType='curved')
    editor.connect(deploy, end, label='done')

    return json.loads(editor.serialize())


def _build_etl_pipeline() -> dict:
    editor = DiagramEditor()
    editor.register_builtin_nodes()

    ingest = editor.add_node(RectangleNode('Ingest'), x=0, y=0)
    validate = editor.add_node(RectangleNode('Validate'), x=200, y=0)
    branch = editor.add_node(DiamondNode('Valid?'), x=400, y=0)
    transform = editor.add_node(RectangleNode('Transform'), x=600, y=0)
    load = editor.add_node(RectangleNode('Load'), x=800, y=0)
    error_queue = editor.add_node(RectangleNode('Error Queue'), x=400, y=200)

    error_queue.background_color = '#f8d7da'
    error_queue.border_color = '#dc3545'

    editor.connect(ingest, validate, label='raw data')
    editor.connect(validate, branch, label='check')
    editor.connect(branch, transform, label='yes', lineColor='#28a745')
    editor.connect(branch, error_queue, label='no', lineColor='#dc3545')
    editor.connect(transform, load, label='clean data')

    return json.loads(editor.serialize())


class Command(BaseCommand):
    help = 'Seed the database with three sample Workflow instances.'

    def handle(self, *args, **options):
        samples = [
            ('Approval Pipeline', _build_approval_pipeline),
            ('ETL Pipeline', _build_etl_pipeline),
            ('Blank Canvas', lambda: {'nodes': [], 'edges': [], 'nodeTypes': []}),
        ]

        for name, builder in samples:
            workflow, created = Workflow.objects.get_or_create(
                name=name,
                defaults={'diagram': builder()},
            )
            status = 'created' if created else 'skipped (already exists)'
            self.stdout.write(f'  {status}: {workflow.name} (pk={workflow.pk})')

        self.stdout.write(self.style.SUCCESS(
            'Done. Open /admin/workflows/workflow/ to see them.'
        ))
