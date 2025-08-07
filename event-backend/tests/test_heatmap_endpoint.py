import pytest
import httpx
import asyncio
from unittest import mock
from httpx import ConnectError, HTTPStatusError
import json

# Base URL for the FastAPI server (assumed to be running)
BASE_URL = "http://localhost:8000"

@pytest.mark.asyncio
async def test_get_map_data_invalid_clustering_response():
    """
    Test the /map endpoint when the spatial clustering service returns invalid or malformed data.
    The endpoint should validate the response and return a 500 error if the data is not valid GeoJSON.
    """
    invalid_responses = [
        # Case 1: Response is not a list (None)
        None,
        # Case 2: Response is a string (invalid JSON)
        "This is not valid JSON",
        # Case 3: Response is a dictionary instead of list
        {"error": "Invalid response format"},
        # Case 4: Response is a list but item missing 'coordinates'
        [
            {
                "id": "tweet_001",
                "cluster_id": 1,
                "text": "Missing coordinates",
                "timestamp": "2023-04-01T12:00:00Z",
                "location": "San Francisco, CA"
            }
        ],
        # Case 5: Response is a list but item has invalid 'coordinates'
        [
            {
                "id": "tweet_002",
                "coordinates": "not a list",
                "cluster_id": 2,
                "text": "Invalid coordinates",
                "timestamp": "2023-04-01T12:00:00Z",
                "location": "Los Angeles, CA"
            }
        ],
        # Case 6: Response is a list but item missing required 'cluster_id'
        [
            {
                "id": "tweet_003",
                "coordinates": [-118.2437, 34.0522],
                "text": "Missing cluster_id",
                "timestamp": "2023-04-01T12:00:00Z",
                "location": "Los Angeles, CA"
            }
        ]
    ]

    for invalid_data in invalid_responses:
        with mock.patch('httpx.AsyncClient.post') as mock_post:
            # Mock the clustering service response
            mock_response = mock.AsyncMock()
            mock_response.status_code = 200
            if isinstance(invalid_data, str):
                mock_response.json.side_effect = json.JSONDecodeError("Expecting value", invalid_data, 0)
            else:
                mock_response.json.return_value = invalid_data
            mock_post.return_value = mock_response

            async with httpx.AsyncClient(base_url=BASE_URL) as client:
                response = await client.get("/map")

            # Assert expected status code based on error type
            expected_status = 503 if isinstance(invalid_data, str) else 500
            assert response.status_code == expected_status, f"Expected {expected_status} status code for invalid data type {type(invalid_data)}, got {response.status_code}"

            # Parse error response
            error_detail = response.json().get("detail", "")
            assert isinstance(error_detail, str)
            
            if expected_status == 503:
                # Service unavailable errors require specific message format
                expected_unavailable_msg = "service temporarily unavailable"
                assert expected_unavailable_msg in error_detail.lower(), \
                    f"503 error message missing '{expected_unavailable_msg}': {error_detail}"
            else:
                # Data validation errors should reference format/structure issues
                validation_keywords = ["invalid", "malformed", "geojson", "format", "error"]
                assert any(keyword in error_detail.lower() for keyword in validation_keywords), \
                    f"500 error message lacks validation keywords: {error_detail}"

@pytest.mark.asyncio
async def test_get_map_data_success():
    """
    Test the /map endpoint for successful response with valid GeoJSON.
    Mocks the spatial clustering service to isolate endpoint logic.
    """
    # Sample valid clustered events response from clustering service (simple list format expected by endpoint)
    mock_clustered_events = [
        {
            "id": "tweet_001",
            "coordinates": [-122.4194, 37.7749],
            "cluster_id": 1,
            "text": "This is a sample tweet about an event",
            "timestamp": "2023-04-01T12:00:00Z",
            "location": "San Francisco, CA"
        }
    ]

    with mock.patch('httpx.AsyncClient.post') as mock_post:
        # Mock the clustering service response
        mock_response = mock.AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_clustered_events
        mock_post.return_value = mock_response

        # Now call the endpoint
        async with httpx.AsyncClient(base_url=BASE_URL) as client:
            response = await client.get("/map")

    # Assert HTTP 200 status
    assert response.status_code == 200

    # Parse JSON response
    data = response.json()

    # Validate GeoJSON FeatureCollection structure
    assert data["type"] == "FeatureCollection"
    assert "features" in data
    assert isinstance(data["features"], list)

    # Ensure at least one feature is returned
    assert len(data["features"]) > 0, "Expected at least one clustered feature"

    # Validate each feature
    for feature in data["features"]:
        assert feature["type"] == "Feature"
        assert "geometry" in feature
        assert "properties" in feature

        geometry = feature["geometry"]
        assert geometry["type"] == "Point"
        coords = geometry["coordinates"]
        assert isinstance(coords, list)
        assert len(coords) == 2
        lon, lat = coords
        assert isinstance(lon, (int, float))
        assert isinstance(lat, (int, float))
        assert -180 <= lon <= 180
        assert -90 <= lat <= 90

        properties = feature["properties"]
        assert "cluster_id" in properties
        assert isinstance(properties["cluster_id"], (int, float))
        assert "id" in properties
        assert "text" in properties
        assert "timestamp" in properties
        assert "location" in properties

        # Optional: validate types of properties
        assert isinstance(properties["id"], str)
        assert isinstance(properties["text"], str)
        assert isinstance(properties["timestamp"], str)
        assert isinstance(properties["location"], str)

@pytest.mark.asyncio
async def test_get_map_data_clustering_service_unavailable():
    """
    Test the /map endpoint when the spatial clustering service is unavailable.
    Should return a 503 error with meaningful message.
    """
    # Mock the POST request to the clustering service to simulate connection error
    with mock.patch('httpx.AsyncClient.post') as mock_post:
        mock_post.side_effect = httpx.RequestError("Connection refused", request=None)
        
        async with httpx.AsyncClient(base_url=BASE_URL) as client:
            response = await client.get("/map")

        # Assert appropriate error status code
        assert response.status_code == 503, f"Expected 503 status code, got {response.status_code}"

        # Parse JSON response
        data = response.json()

        # Verify error message indicates service unavailability
        assert "detail" in data
        assert isinstance(data["detail"], str)
        error_msg = data["detail"].lower()
        assert "service temporarily unavailable" in error_msg, f"Error message does not match expected: {data['detail']}"

# Run the test manually if needed
if __name__ == "__main__":
    asyncio.run(test_get_map_data_success())
