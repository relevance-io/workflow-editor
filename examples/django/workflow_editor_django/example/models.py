from django.db import models


class Workflow(models.Model):
    name = models.CharField(max_length=255)

    # Serialized diagram produced by editor.serialize() /
    # DiagramEditor.serialize(): {"nodes": [...], "edges": [...], "nodeTypes": [...]}
    diagram = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self) -> str:
        return self.name
