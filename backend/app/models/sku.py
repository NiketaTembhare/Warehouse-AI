from sqlalchemy import Column, String, Float
from app.models.base import Base

class SKU(Base):
    __tablename__ = "sku_master"

    sku_id         = Column(String, primary_key=True)
    sku_name       = Column(String)
    category       = Column(String)
    sub_category   = Column(String)
    weight_kg      = Column(Float)
    length_cm      = Column(Float)
    width_cm       = Column(Float)
    height_cm      = Column(Float)
    storage_type   = Column(String)
    preferred_zone = Column(String)