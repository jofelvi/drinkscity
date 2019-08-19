# This file should item: Store.first the record creation needed to seed the database with its default values.
# The data can then be loaded with the rails db:seed command (or created alongside the database with db:setup).
#
# Examples:
#
#   movies = Movie.create([{ name: 'Star Wars' }, { name: 'Lord of the Rings' }])
#   Character.create(name: 'Luke', movie: movies.first)

User.destroy_all
Store.destroy_all
Product.destroy_all
OrderStatus.destroy_all
Event.destroy_all

User.create! id: 1, fullname: "admin", email: "admin@gmail.com", password: "test123", password_confirmation: "test123",role: 0
User.create! id: 2, fullname: "store1_admin", email: "store1_admin@gmail.com", password: "test123", password_confirmation: "test123",role: 1
User.create! id: 3, fullname: "store2_admin", email: "store2_admin@gmail.com", password: "test123", password_confirmation: "test123",role: 1
User.create! id: 4, fullname: "agent1", email: "agent1@gmail.com", password: "test123", password_confirmation: "test123",role: 2
User.create! id: 5, fullname: "agent2", email: "agent2@gmail.com", password: "test123", password_confirmation: "test123",role: 2
User.create! id: 6, fullname: "agent3", email: "agent3@gmail.com", password: "test123", password_confirmation: "test123",role: 3
User.create! id: 7, fullname: "agent4", email: "agent4@gmail.com", password: "test123", password_confirmation: "test123", role: 5
User.create! id: 8, fullname: "customer", email: "customer@gmail.com", password: "test123", password_confirmation: "test123", role: 4
User.create! id: 9, fullname: "Jesús Torres", email: "jesustc17@gmail.com", password: "test123", password_confirmation: "test123", role: 0

Store.create! id: 1, name: "Store 1", legal_agent: "legal agent", legal_agent_phone: "0412-5567786", address:"Santiago de chile, Chile", kind: 1, status: 1, longitude: '8.293781', latitude: '-62.741614', time_opened: '03:00 - 11:00', days_opened: 'lun-___-___-___-___-___-___', phone: "3103212345", rut: "000000000-0"
Store.create! id: 2, name: "Store 2", legal_agent: "legal agent", legal_agent_phone: "0412-5567786", address:"Santiago de chile, Chile", kind: 2, status: 2, longitude: '8.275690', latitude: '-62.758039', time_opened: '03:00 - 11:00', days_opened: 'lun-___-___-___-___-___-___'
Store.create! id: 3, name: "Store 3", legal_agent: "legal agent", legal_agent_phone: "0412-5567786", address:"Santiago de chile, Chile", kind: 3, status: 0, longitude: '8.352211', latitude: '-62.672348', time_opened: '03:00 - 11:00', days_opened: 'lun-___-___-___-___-___-___'
Store.create! id: 4, name: "Store 4", legal_agent: "legal agent", legal_agent_phone: "0412-5567786", address:"Santiago de chile, Chile", kind: 3, status: 1, longitude: '8.293781', latitude: '-62.741614', time_opened: '03:00 - 11:00', days_opened: 'lun-___-___-___-___-___-___'
Store.create! id: 5, name: "Store 5", legal_agent: "legal agent", legal_agent_phone: "0412-5567786", address:"Santiago de chile, Chile", kind: 3, status: 1, longitude: '8.293781', latitude: '-62.741614', time_opened: '03:00 - 11:00', days_opened: 'lun-___-___-___-___-___-___'

Product.create! id: 1,  item: Store.first, user_id: 1, stock: 10, name: "Absolute Mango", price: 9990, active: true, category: 0, description: "Absolute Mango 750cc"
Product.create! id: 2,  item: Store.first, user_id: 1, stock: 10, name: "Tequila Jose Cuervo", price: 7500 , active: true, category: 0, description: "Tequila, mezcal 38° alcohol, hecho en Mexico"
Product.create! id: 3,  item: Store.first, user_id: 1, stock: 10, name: "Cerveza Estrella Damn", price: 250 , active: true, category: 0, description: "Cervezas Estrella Damn 350 cc 4,8°"
Product.create! id: 4,  item: Store.first, user_id: 1, stock: 10, name: "Alto del carmen", price: 14990 , active: true, category: 0, description: "Alto del Carmen 46° 750cc"
Product.create! id: 5,  item: Store.second, user_id: 1, stock: 10, name: "Ciroc Vodka", price: 45000 , active: true, category: 0, description: "Ciroc Vodka 750cc 40°"
Product.create! id: 6,  item: Store.first, user_id: 1, stock: 10, name: "Absolute Mango", price: 9990, active: true, category: 0, description: "Absolute Mango 750cc", priority: 0
Product.create! id: 7,  item: Store.second, user_id: 1, stock: 10, name: "Tequila Jose Cuervo", price: 7500 , active: true, category: 0, description: "Tequila, mezcal 38° alcohol, hecho en Mexico", priority: 1
Product.create! id: 8,  item: Store.first, user_id: 1, stock: 10, name: "Cerveza Estrella Damn", price: 250 , active: true, category: 0, description: "Cervezas Estrella Damn 350 cc 4,8°", priority: 2
Product.create! id: 9,  item: Store.first, user_id: 1, stock: 10, name: "Alto del carmen", price: 14990 , active: true, category: 0, description: "Alto del Carmen 46° 750cc", priority: 3
Product.create! id: 10,  item: Store.first, user_id: 1, stock: 10, name: "Ciroc Vodka", price: 45000 , active: true, category: 0, description: "Ciroc Vodka 750cc 40°", priority: 4
Product.create! id: 11,  item: Store.second, user_id: 1, stock: 10, name: "Otro", price: 45000 , active: true, category: 0, description: "Otro Descripcion", priority: 0
Product.create! id: 12,  item: Store.first, user_id: 1, stock: 10, name: "Uno mas", price: 45000 , active: true, category: 0, description: "Uno mas Descripcion", priority: 1
Product.create! id: 13,  item: Store.first, user_id: 1, stock: 10, name: "Cacique", price: 45000 , active: true, category: 0, description: "Uno mas Descripcion", priority: 2
Product.create! id: 14,  item: Store.second, user_id: 1, stock: 10, name: "Cacique", price: 45000 , active: true, category: 0, description: "Uno mas Descripcion", priority: 3
Product.create! id: 15,  item: Store.first, user_id: 1, stock: 10, name: "Sangria", price: 45000 , active: true, category: 0, description: "Uno mas Descripcion", priority: 3
Product.create! id: 16,  item: Store.first, user_id: 1, stock: 10, name: "Nuvo", price: 45000 , active: true, category: 0, description: "Uno mas Descripcion", priority: 4
Product.create! id: 17,  item: Store.second, user_id: 1, stock: 10, name: "Don Perignon Rose", price: 45000 , active: true, category: 0, description: "Uno mas Descripcion", priority: 0
Product.create! id: 18,  item: Store.first, user_id: 1, stock: 10, name: "Valdivieso brut rose", price: 45000 , active: true, category: 0, description: "Uno mas Descripcion", priority: 1

OrderStatus.create! id: 1, name: :in_progress
OrderStatus.create! id: 2, name: :pending
OrderStatus.create! id: 3, name: :aproved
OrderStatus.create! id: 4, name: :validated
OrderStatus.create! id: 5, name: :canceled

Event.create! id: 1, store_id: 1, user_id: User.second.id, name: "lñkajsdfnalkfa", category: 0, description: "Uno mas Descripcion", start_datetime: "01/01/2017 05:00 PM", end_datetime: "01/01/2017 11:00 PM", video_link: 'https://youtu.be/SI_gV7lDX3Q', longitude: '8.293781', latitude: '-62.741614', address: "asdf"
Event.create! id: 2, store_id: 1, user_id: User.second.id, name: "Entrega proyecto", category: 0, description: "Entrega del proyecto de DrinksCity al cliente", start_datetime: "21/01/2017 08:00 AM", end_datetime: "28/01/2017 04:00 PM", video_link: 'https://www.youtube.com/watch?v=GMB2fE6dIHU', longitude: '8.293781', latitude: '-62.741614', address: "asdf"

Product.create! id: 19, item: Event.second, stock: 10, user_id: 1, name: "Champagne", price: 45000 , active: true, category: 0, description: "Uno mas Descripcion", priority: 2
Product.create! id: 20, item: Event.second, stock: 10, user_id: 1, name: "Jhonnie Walker", price: 45000 , active: true, category: 0, description: "Uno mas Descripcion", priority: 3
Product.create! id: 21, item: Event.second, stock: 10, user_id: 1, name: "Moet Rose", price: 45000 , active: true, category: 0, description: "Uno mas Descripcion", priority: 4
Product.create! id: 22, item: Event.second, stock: 10, user_id: 1, name: "Cerveza Estrella Damn", price: 250 , active: true, category: 0, description: "Cervezas Estrella Damn 350 cc 4,8°", priority: 3
