from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import httpx
import logging

router = APIRouter()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Assume the clustering service is running at this URL
CLUSTERING_SERVICE_URL = "http://clustering-service:3001/cluster"
# Alternatively, if running locally: "http://localhost:3001/cluster"

@router.get("/map")
async def get_map_data() -> Dict[str, Any]:
    """
    Endpoint to serve heatmap data in GeoJSON format.
    Fetches clustered events from the spatial clustering service.

    Returns:
        A GeoJSON FeatureCollection with clustered event data
        
    Raises:
        HTTPException:
            - 503: If the clustering service is unreachable
            - 500: If data transformation fails due to invalid input
    """
    try:
        # Fetch clustered events from the spatial clustering service
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    CLUSTERING_SERVICE_URL,
                    json={"radiusInMeters": 1000},  # optional parameter
                    timeout=10.0  # Set timeout for service call
                )
                response.raise_for_status()
                clustered_events = response.json()
            except httpx.TimeoutException as e:
                logger.error(f"Timeout connecting to clustering service: {str(e)}")
                raise HTTPException(
                    status_code=503,
                    detail="Service temporarily unavailable, please try again later"
                )
            except httpx.RequestError as e:
                logger.error(f"Request error connecting to clustering service: {str(e)}")
                raise HTTPException(
                    status_code=503,
                    detail="Service temporarily unavailable, please try again later"
                )
            except httpx.HTTPStatusError as e:
                logger.error(f"Clustering service returned error status: {str(e)}")
                raise HTTPException(
                    status_code=503,
                    detail="Service temporarily unavailable, please try again later"
                )
            except ValueError as e:  # JSON decoding error
                logger.error(f"Failed to decode JSON response from clustering service: {str(e)}")
                raise HTTPException(
                    status_code=503,
                    detail="Service temporarily unavailable, please try again later"
                )

        # Validate the structure of the returned data
        if not isinstance(clustered_events, list):
            logger.error(f"Invalid response structure from clustering service: expected list, got {type(clustered_events)}")
            raise HTTPException(
                status_code=500,
                detail="Invalid data format received from clustering service"
            )

        # Transform clustered events into GeoJSON FeatureCollection
        features = []
        for event in clustered_events:
            if not isinstance(event, dict):
                logger.warning("Skipping invalid event data: expected dictionary")
                continue
                
            # Extract coordinates [lon, lat] from event
            coordinates = event.get("coordinates", [])
            if not isinstance(coordinates, list) or len(coordinates) != 2:
                logger.warning(f"Skipping event with invalid coordinates: {coordinates}")
                continue
            
            # Validate coordinate types
            try:
                lon = float(coordinates[0])
                lat = float(coordinates[1])
            except (ValueError, TypeError):
                logger.warning(f"Skipping event with non-numeric coordinates: {coordinates}")
                continue
            
            # Validate coordinate ranges
            if not (-180 <= lon <= 180) or not (-90 <= lat <= 90):
                logger.warning(f"Skipping event with invalid coordinate range: {coordinates}")
                continue

            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat]  # [longitude, latitude]
                },
                "properties": {
                    "id": str(event.get("id", "")) if event.get("id") is not None else "",
                    "text": str(event.get("text", "")) if event.get("text") is not None else "",
                    "timestamp": str(event.get("timestamp", "")) if event.get("timestamp") is not None else "",
                    "location": str(event.get("location", "")) if event.get("location") is not None else "",
                    "cluster_id": event.get("cluster_id")
                }
            }
            features.append(feature)
        
        geojson_data = {
            "type": "FeatureCollection",
            "features": features
        }
        
        return geojson_data
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Catch any other unexpected errors during data transformation
        logger.error(f"Unexpected error processing clustered events: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error processing data"
        )
