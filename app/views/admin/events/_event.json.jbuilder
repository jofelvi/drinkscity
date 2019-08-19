json.extract! event, :id, :store_id, :user_id, :priority, :name, :category, :description, :start_datetime, :end_datetime, :video_link, :created_at, :updated_at
json.url event_url(event, format: :json)
