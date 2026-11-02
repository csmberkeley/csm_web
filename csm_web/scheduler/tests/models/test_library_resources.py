import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from scheduler.factories import CourseFactory
from scheduler.models import Course, LibraryResource, ResourceCategory


def missing_pk(model):
    largest_pk = model.objects.order_by("-pk").values_list("pk", flat=True).first()
    return (largest_pk or 0) + 1


def create_category(course, name="Lecture notes"):
    return ResourceCategory.objects.create(
        name=name,
        course=course,
        created_at=timezone.now(),
    )


@pytest.mark.django_db
def test_resource_category_must_belong_to_same_course():
    category_course = CourseFactory.create()
    resource_course = CourseFactory.create()
    category = create_category(category_course)

    with pytest.raises(ValidationError) as exc_info:
        LibraryResource.objects.create(
            course=resource_course,
            category=category,
        )

    assert "category" in exc_info.value.message_dict
    assert "same course" in exc_info.value.message_dict["category"][0]


@pytest.mark.django_db
def test_resource_category_can_belong_to_same_course():
    course = CourseFactory.create()
    category = create_category(course)

    resource = LibraryResource.objects.create(course=course, category=category)

    assert resource.pk is not None
    assert resource.category == category


@pytest.mark.django_db
def test_resource_can_have_no_category():
    resource = LibraryResource.objects.create(course=CourseFactory.create())

    assert resource.pk is not None
    assert resource.category is None


@pytest.mark.django_db
def test_invalid_category_id_is_reported_as_validation_error():
    course = CourseFactory.create()
    create_category(course)
    invalid_category_id = missing_pk(ResourceCategory)
    assert not ResourceCategory.objects.filter(pk=invalid_category_id).exists()

    resource = LibraryResource(
        course=course,
        category_id=invalid_category_id,
    )

    with pytest.raises(ValidationError) as exc_info:
        resource.full_clean()

    assert "category" in exc_info.value.message_dict


@pytest.mark.django_db
def test_invalid_course_id_is_reported_as_validation_error():
    invalid_course_id = missing_pk(Course)
    assert not Course.objects.filter(pk=invalid_course_id).exists()

    resource = LibraryResource(course_id=invalid_course_id)

    with pytest.raises(ValidationError) as exc_info:
        resource.full_clean()

    assert "course" in exc_info.value.message_dict


@pytest.mark.django_db
def test_invalid_course_and_category_ids_are_reported_together():
    invalid_course_id = missing_pk(Course)
    invalid_category_id = missing_pk(ResourceCategory)
    resource = LibraryResource(
        course_id=invalid_course_id,
        category_id=invalid_category_id,
    )

    with pytest.raises(ValidationError) as exc_info:
        resource.full_clean()

    assert "course" in exc_info.value.message_dict
    assert "category" in exc_info.value.message_dict


@pytest.mark.django_db
def test_invalid_resource_category_course_id_is_reported_as_validation_error():
    invalid_course_id = missing_pk(Course)
    category = ResourceCategory(
        name="Lecture notes",
        course_id=invalid_course_id,
        created_at=timezone.now(),
    )

    with pytest.raises(ValidationError) as exc_info:
        category.full_clean()

    assert "course" in exc_info.value.message_dict


@pytest.mark.django_db
def test_restricted_course_cannot_have_resource_category():
    restricted_course = CourseFactory.create(is_restricted=True)

    with pytest.raises(ValidationError) as exc_info:
        create_category(restricted_course)

    assert "course" in exc_info.value.message_dict


@pytest.mark.django_db
def test_restricted_course_cannot_have_library_resource():
    restricted_course = CourseFactory.create(is_restricted=True)

    with pytest.raises(ValidationError) as exc_info:
        LibraryResource.objects.create(course=restricted_course)

    assert "course" in exc_info.value.message_dict


@pytest.mark.django_db
def test_category_name_must_be_unique_within_course():
    course = CourseFactory.create()
    create_category(course, name="Practice")

    with pytest.raises(ValidationError):
        create_category(course, name="Practice")


@pytest.mark.django_db
def test_category_name_can_be_reused_in_another_course():
    first_course = CourseFactory.create()
    second_course = CourseFactory.create()

    first_category = create_category(first_course, name="Practice")
    second_category = create_category(second_course, name="Practice")

    assert first_category.pk != second_category.pk
