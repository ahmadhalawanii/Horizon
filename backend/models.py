"""SQLAlchemy ORM models for the Horizon digital twin."""
from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, ForeignKey, func
)
from sqlalchemy.orm import relationship
from backend.database import Base
from datetime import datetime


class Home(Base):
    __tablename__ = "homes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    rooms = relationship("Room", back_populates="home", cascade="all, delete-orphan")
    preferences = relationship("UserPreference", back_populates="home", cascade="all, delete-orphan")


class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True, index=True)
    home_id = Column(Integer, ForeignKey("homes.id"), nullable=False)
    name = Column(String, nullable=False)
    home = relationship("Home", back_populates="rooms")
    devices = relationship("Device", back_populates="room", cascade="all, delete-orphan")


class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    type = Column(String, nullable=False)          # ac, ev_charger, water_heater, washer_dryer
    name = Column(String, nullable=False)
    status = Column(String, default="off")          # on / off / standby
    power_kw = Column(Float, default=0.0)
    setpoint = Column(Float, nullable=True)         # e.g. 23.0 for AC
    metadata_json = Column(Text, nullable=True)     # JSON string
    room = relationship("Room", back_populates="devices")
    telemetry = relationship("Telemetry", back_populates="device", cascade="all, delete-orphan")


class Telemetry(Base):
    __tablename__ = "telemetry"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    ts = Column(DateTime, default=datetime.utcnow, index=True)
    power_kw = Column(Float, nullable=False)
    temp_c = Column(Float, nullable=True)
    status = Column(String, nullable=True)
    device = relationship("Device", back_populates="telemetry")


class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(Integer, primary_key=True, index=True)
    ts = Column(DateTime, default=datetime.utcnow, index=True)
    title = Column(String, nullable=False)
    reason = Column(String, nullable=False)
    estimated_kwh_saved = Column(Float, default=0.0)
    estimated_aed_saved = Column(Float, default=0.0)
    estimated_co2_saved = Column(Float, default=0.0)
    confidence = Column(Float, default=0.5)
    action_json = Column(Text, nullable=True)


class Scenario(Base):
    __tablename__ = "scenarios"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)
    payload_json = Column(Text, nullable=False)


class UserPreference(Base):
    __tablename__ = "user_preferences"
    id = Column(Integer, primary_key=True, index=True)
    home_id = Column(Integer, ForeignKey("homes.id"), nullable=False)
    comfort_min_c = Column(Float, default=22.0)
    comfort_max_c = Column(Float, default=26.0)
    ev_departure_time = Column(String, default="07:30")
    ev_target_soc = Column(Float, default=80.0)
    max_shift_minutes = Column(Integer, default=120)
    mode = Column(String, default="balanced")       # comfort | balanced | saver
    home = relationship("Home", back_populates="preferences")
