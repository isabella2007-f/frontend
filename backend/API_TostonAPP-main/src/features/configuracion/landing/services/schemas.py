from pydantic import BaseModel
from typing import Optional


class LandingConfigResponse(BaseModel):
    heroBadge:              Optional[str] = None
    heroTitle:              Optional[str] = None
    heroDescription:        Optional[str] = None
    historyTitle:           Optional[str] = None
    historyDescription:     Optional[str] = None
    ctaTitle:               Optional[str] = None
    ctaDescription:         Optional[str] = None
    contactPhone1:          Optional[str] = None
    contactPhone2:          Optional[str] = None
    contactAddressLine:     Optional[str] = None
    contactCity:            Optional[str] = None
    contactInstagramUrl:    Optional[str] = None
    contactInstagramHandle: Optional[str] = None
    horarioLunesViernes:    Optional[str] = None
    horarioSabado:          Optional[str] = None

    class Config:
        from_attributes = True


class LandingConfigUpdate(BaseModel):
    heroBadge:              Optional[str] = None
    heroTitle:              Optional[str] = None
    heroDescription:        Optional[str] = None
    historyTitle:           Optional[str] = None
    historyDescription:     Optional[str] = None
    ctaTitle:               Optional[str] = None
    ctaDescription:         Optional[str] = None
    contactPhone1:          Optional[str] = None
    contactPhone2:          Optional[str] = None
    contactAddressLine:     Optional[str] = None
    contactCity:            Optional[str] = None
    contactInstagramUrl:    Optional[str] = None
    contactInstagramHandle: Optional[str] = None
    horarioLunesViernes:    Optional[str] = None
    horarioSabado:          Optional[str] = None
