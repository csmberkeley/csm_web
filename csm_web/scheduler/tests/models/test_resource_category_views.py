import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from scheduler.factories import CoordinatorFactory, CourseFactory, MentorFactory
from scheduler.models import LibraryResource, ResourceCategory
from scheduler.tests.models.test_library_resources import create_category

LIST_URL = "library-category-list"
DETAIL_URL = "library-category-detail"


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def course():
    return CourseFactory()


@pytest.fixture
def coordinator(course):
    return CoordinatorFactory(course=course)


@pytest.mark.django_db
def test_list_requires_course_param(coordinator):
    response = client_for(coordinator.user).get(reverse(LIST_URL))
    assert response.status_code == 400


@pytest.mark.django_db
def test_list_filters_by_course(course, coordinator):
    create_category(course, "Worksheets")
    create_category(CourseFactory(), "Other")
    response = client_for(coordinator.user).get(reverse(LIST_URL), {"course": course.pk})
    assert response.status_code == 200
    assert [c["name"] for c in response.json()] == ["Worksheets"]


@pytest.mark.django_db
def test_coordinator_can_create_category(course, coordinator):
    response = client_for(coordinator.user).post(
        reverse(LIST_URL),
        {"name": "  Exams ", "course": course.pk},
        format="json",
    )
    assert response.status_code == 201
    category = ResourceCategory.objects.get()
    assert category.name == "Exams"
    assert category.created_by == coordinator.user
    assert category.created_at is not None


@pytest.mark.django_db
def test_mentor_cannot_create_category(course):
    mentor = MentorFactory(course=course)
    response = client_for(mentor.user).post(
        reverse(LIST_URL), {"name": "Exams", "course": course.pk}, format="json"
    )
    assert response.status_code == 403
    assert not ResourceCategory.objects.exists()


@pytest.mark.django_db
def test_coordinator_of_other_course_cannot_create_category(course):
    other = CoordinatorFactory()
    response = client_for(other.user).post(
        reverse(LIST_URL), {"name": "Exams", "course": course.pk}, format="json"
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_blank_name_rejected(course, coordinator):
    response = client_for(coordinator.user).post(
        reverse(LIST_URL), {"name": "   ", "course": course.pk}, format="json"
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_duplicate_name_rejected_case_insensitively(course, coordinator):
    create_category(course, "Exams")
    response = client_for(coordinator.user).post(
        reverse(LIST_URL), {"name": "exams", "course": course.pk}, format="json"
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_restricted_course_rejected_as_400():
    restricted = CourseFactory(is_restricted=True)
    coordinator = CoordinatorFactory(course=restricted)
    response = client_for(coordinator.user).post(
        reverse(LIST_URL), {"name": "Exams", "course": restricted.pk}, format="json"
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_update_renames_category(course, coordinator):
    category = create_category(course, "Old")
    response = client_for(coordinator.user).patch(
        reverse(DETAIL_URL, args=[category.pk]), {"name": "New"}, format="json"
    )
    assert response.status_code == 200
    category.refresh_from_db()
    assert category.name == "New"


@pytest.mark.django_db
def test_update_cannot_change_course(course, coordinator):
    category = create_category(course)
    other_course = CourseFactory()
    CoordinatorFactory(user=coordinator.user, course=other_course)
    response = client_for(coordinator.user).patch(
        reverse(DETAIL_URL, args=[category.pk]),
        {"course": other_course.pk},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_non_coordinator_cannot_update_or_delete(course):
    category = create_category(course)
    mentor = MentorFactory(course=course)
    client = client_for(mentor.user)
    url = reverse(DETAIL_URL, args=[category.pk])
    assert client.patch(url, {"name": "X"}, format="json").status_code == 403
    assert client.delete(url).status_code == 403
    assert ResourceCategory.objects.filter(pk=category.pk).exists()


def make_resource(course, category):
    return LibraryResource.objects.create(course=course, category=category)


@pytest.mark.django_db
def test_delete_without_reassign_uncategorizes_resources(course, coordinator):
    category = create_category(course)
    resource = make_resource(course, category)
    response = client_for(coordinator.user).delete(
        reverse(DETAIL_URL, args=[category.pk])
    )
    assert response.status_code == 200
    assert response.json() == {"uncategorized": 1}
    resource.refresh_from_db()
    assert resource.category is None


@pytest.mark.django_db
def test_delete_with_reassign_moves_resources(course, coordinator):
    category = create_category(course, "Old")
    target = create_category(course, "New")
    resource = make_resource(course, category)
    response = client_for(coordinator.user).delete(
        reverse(DETAIL_URL, args=[category.pk]) + f"?reassign_to={target.pk}"
    )
    assert response.status_code == 200
    assert response.json() == {"reassigned": 1}
    resource.refresh_from_db()
    assert resource.category == target
    assert not ResourceCategory.objects.filter(pk=category.pk).exists()


@pytest.mark.django_db
def test_reassign_to_other_course_or_self_rejected(course, coordinator):
    category = create_category(course, "Old")
    foreign = create_category(CourseFactory(), "Foreign")
    client = client_for(coordinator.user)
    url = reverse(DETAIL_URL, args=[category.pk])
    assert client.delete(f"{url}?reassign_to={foreign.pk}").status_code == 400
    assert client.delete(f"{url}?reassign_to={category.pk}").status_code == 400
    assert ResourceCategory.objects.filter(pk=category.pk).exists()
