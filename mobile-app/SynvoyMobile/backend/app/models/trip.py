from sqlalchemy import Column, String, DateTime, Boolean, JSON, Text, Integer, Numeric, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class Trip(Base):
    __tablename__ = "trips"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    budget = Column(Numeric(10, 2), nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="planning")  # planning, active, completed, cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="trips")
    destinations = relationship("Destination", back_populates="trip", cascade="all, delete-orphan")
    price_alerts = relationship("PriceAlert", back_populates="trip", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Trip(id={self.id}, title='{self.title}', status='{self.status}')>"

class Destination(Base):
    __tablename__ = "destinations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trip_id = Column(String(36), ForeignKey("trips.id"), nullable=False)
    city = Column(String(100), nullable=False)
    country = Column(String(100), nullable=False)
    arrival_date = Column(DateTime(timezone=True), nullable=True)
    departure_date = Column(DateTime(timezone=True), nullable=True)
    priority = Column(Integer, default=1)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    trip = relationship("Trip", back_populates="destinations")
    
    def __repr__(self):
        return f"<Destination(id={self.id}, city='{self.city}', country='{self.country}')>" 