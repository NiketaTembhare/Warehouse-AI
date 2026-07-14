from sqlalchemy import Column, String, Integer
from app.models.base import Base

class Inventory(Base):
    __tablename__ = "inventory"

    inventory_id = Column(String, primary_key=True)
    sku_id       = Column(String)
    node_id      = Column(String)
    quantity     = Column(Integer)
    last_updated = Column(String)