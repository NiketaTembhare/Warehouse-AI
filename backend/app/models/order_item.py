from sqlalchemy import Column, String, Integer
from app.models.base import Base

class OrderItem(Base):
    __tablename__ = "order_items"

    order_item_id = Column(String, primary_key=True)
    order_id      = Column(String)
    sku_id        = Column(String)
    quantity      = Column(Integer)