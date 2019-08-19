json.extract! ticket, :id, :name, :price, :stock, :active, :start_date, :end_date, :created_at, :updated_at
json.url ticket_url(ticket, format: :json)
