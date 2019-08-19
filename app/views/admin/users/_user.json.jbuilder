json.extract! user, :id, :fullname, :rut, :email, :address, :phone, :created_at, :updated_at
json.url user_url(user, format: :json)
