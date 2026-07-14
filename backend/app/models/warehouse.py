from sqlalchemy import Column, String, Integer, Float
from app.models.base import Base

class WarehouseNode(Base):
    __tablename__ = "warehouse_nodes"

    node_id   = Column(String, primary_key=True)
    node_type = Column(String)
    zone      = Column(String)
    aisle     = Column(String)
    rack      = Column(Integer)
    shelf     = Column(Integer)
    x         = Column(Float)
    y         = Column(Float)


class WarehousePath(Base):
    __tablename__ = "warehouse_paths"

    id        = Column(Integer, primary_key=True, autoincrement=True)
    from_node = Column(String)
    to_node   = Column(String)
    distance  = Column(Float)