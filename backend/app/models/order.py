from sqlalchemy import Column, String
from app.models.base import Base

class Order(Base):
    __tablename__ = "orders"

    order_id    = Column(String, primary_key=True)
    order_date  = Column(String)
    customer_id = Column(String)
    priority    = Column(String)
    status      = Column(String)