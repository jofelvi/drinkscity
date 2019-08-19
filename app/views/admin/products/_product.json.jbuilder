json.extract! product, :id, :store, :user_id, :name, :price, :active, :category, :priority, :description, :start_datetime, :end_datetime, :stock, :created_at, :updated_at
json.url product_url(product, format: :json)
