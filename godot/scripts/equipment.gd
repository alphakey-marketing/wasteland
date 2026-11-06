class_name GearDefinition
extends Resource

@export var label: String = ""
@export_enum("armor", "weapon", "prosthetic") var slot: String = "armor"
@export var parts: Array[Dictionary] = []
# Each part declares bone, dimensions, offset, color and optional shape.
# Slots own their visibility; no item-name branches in the assembler.
