from decimal import Decimal
from rest_framework import serializers
from apps.crm.models import Deal, Stage


class DealSerializer(serializers.ModelSerializer):
    """Used for read responses and general representation."""

    is_closed = serializers.BooleanField(read_only=True)

    class Meta:
        model = Deal
        fields = [
            "id", "title", "amount", "currency", "pipeline", "stage",
            "company", "primary_contact", "owner", "expected_close_date",
            "closed_at", "lost_reason", "custom_fields", "is_closed",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "closed_at", "created_at", "updated_at"]

    def validate_amount(self, value: Decimal) -> Decimal:
        if value < 0:
            raise serializers.ValidationError("Amount cannot be negative")
        return value


class DealCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deal
        fields = [
            "title", "amount", "currency", "pipeline", "stage",
            "company", "primary_contact", "owner", "expected_close_date",
            "custom_fields",
        ]

    def validate(self, attrs):
        # Stage must belong to the chosen pipeline — a cross-object rule that
        # belongs at the serializer level since it involves two input fields.
        pipeline = attrs.get("pipeline")
        stage = attrs.get("stage")
        if pipeline and stage and stage.pipeline_id != pipeline.id:
            raise serializers.ValidationError(
                {"stage": "Stage does not belong to the selected pipeline"}
            )
        return attrs


class DealUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deal
        fields = ["title", "amount", "expected_close_date", "owner", "custom_fields"]
        extra_kwargs = {field: {"required": False} for field in fields}


class DealStageMoveSerializer(serializers.Serializer):
    stage_id = serializers.UUIDField()

    def validate_stage_id(self, value):
        if not Stage.objects.filter(id=value).exists():
            raise serializers.ValidationError("Stage does not exist")
        return value


class PipelineStageSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    order = serializers.IntegerField()
    deal_count = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=16, decimal_places=2)
