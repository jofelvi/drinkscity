# == Schema Information
#
# Table name: stores
#
#  id                :integer          not null, primary key
#  user_id           :integer
#  longitude         :float
#  latitude          :float
#  address           :string
#  kind              :integer
#  status            :integer
#  delivery          :boolean
#  name              :string
#  description       :text
#  rut               :string
#  phone             :string
#  email             :string
#  region            :integer
#  days_opened       :string
#  time_opened       :string
#  legal_agent       :string
#  legal_agent_rut   :string
#  legal_agent_phone :string
#  legal_agent_email :string
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  logo              :string
#  logo_file_name    :string
#  logo_content_type :string
#  logo_file_size    :integer
#  logo_updated_at   :datetime
#

class Store < ApplicationRecord
	acts_as_favoritable


	include Imageable

	geocoded_by :address               # can also be an IP address
	after_validation :geocode          # auto-fetch coordinates
	has_many :products, as: :item, dependent: :destroy
	has_many :events, dependent: :destroy
	has_and_belongs_to_many :users
	has_many :schedules
	has_many :orders
	before_create :default_values
	#validates :time_opened, length: { is: 13 }

	validate :validate_schedules_quantity
	validate :validate_schedules_uniqness



	accepts_nested_attributes_for :schedules, reject_if: :all_blank, allow_destroy: true


	has_attached_file :logo, styles: {large: "2600x600", medium: "800x600", thumb: "318x200", mini: "256x256"}, default_url: "https://pngimage.net/wp-content/uploads/2018/06/online-store-png-6.png"
	validates_attachment_content_type :logo, content_type: /\Aimage\/.*\Z/

	validates_presence_of :kind, :name, :address, :legal_agent_phone, :rut
	
	validates :phone, presence: true, numericality: true
	validates :legal_agent_phone, presence: true, numericality: true

	enum kind: [ :bar_pub, :botilleria, :delivery, :discoteque, :distribuidora, :productora_de_eventos, :alojamiento, :restobar ]
	enum status: [ :pendig, :active, :inactive ]

	enum region: [:arica_y_parinacota, :tarapaca, :antofagasta, :atacama, :coquimbo, :valparaiso, :metropolitana_de_santiago,
		:libertador_general_bernardo_o_higgins, :maule, :biobio, :la_araucania, :los_lagos,
		:aisen_del_general_carlos_ibanez_del_campo, :magallanes_y_de_la_antartica_chilena ]

	after_create :send_email_registration

	def default_values
		self.status ||= 0
	end

	def accept_store
		self.status = 1
		self.save
	end

	def delete_store
		self.status = 2
		self.save!
	end

	def check_open
		i = 0
		day = 0
		distance = 0
		if self.schedules.length > 0
			self.schedules.each do |schedule|
				if schedule.day_of_week == ( I18n.l Time.now, format: :dia).titleize 
					i = i+1
					break
				else
					tempday = 0
					temp = 0
					if day == 0
						day = get_next_open_day( schedule.day_of_week)
						today = get_next_open_day(( I18n.l Time.now, format: :dia).titleize )
						if today > day
							distance= today-day
						else
							distance= day-today
						end
					else
						tempday = get_next_open_day( schedule.day_of_week)
						today = get_next_open_day(( I18n.l Time.now, format: :dia).titleize )
						if today > tempday
							temp= today-tempday
							if distance <  temp
								distance = temp
								day =tempday
							end
						else
							temp = tempday-today
							if temp < distance
								distance = temp 
								day =tempday
							end
						end
						
					end
					
				end	
			end
		end
		i == 0 ?  convert_int_to_day(day) : false
	end


	def get_next_open_day(day)
		case day
			when "Lunes"
				day_of_week = 1							
			when "Martes"
				day_of_week = 2
			when "Miercoles"
				day_of_week = 3
			when "Jueves"
				day_of_week = 4
			when "Viernes"
				day_of_week = 5
			when "Sabado"
				day_of_week = 6
			when "Domingo"
				day_of_week = 7
		end
		return day_of_week
	end

	def convert_int_to_day(day)
		case day
		when 1
			day_of_week = "Lunes"							
		when 2
			day_of_week = "Martes"
		when 3
			day_of_week = "Miercoles"
		when 4
			day_of_week = "Jueves"
		when 5
			day_of_week = "Viernes"
		when 6
			day_of_week = "Sabado"
		when 7
			day_of_week = "Domingo"
	end
	return day_of_week
	end

	def check_status
		now = Time.now.utc.in_time_zone("America/Santiago")
		schedule = self.schedules.send(now.strftime('%A').downcase).last
		if schedule
			opens = schedule.opens.in_time_zone("America/Santiago")
			closes = schedule.closes.in_time_zone("America/Santiago")
			if opens < closes
				if now.between?(opens, closes)
					return [true, opens, closes]
				else
					return [false, opens, closes]
				end
			else
				if now.between?(closes, opens)
					return [false, opens, closes]
				else
					return [true, opens, closes]
				end
			end
		else
			return [false]
		end
	end

	def self.convert_weekdays(array)
		week_days=""
    array.split('-').each do |week_day|
			case week_day.downcase
				when "lun"
					week_days << "monday-"
				when "mar"
					week_days << "tuesday-"
				when "mie"
					week_days << "wednesday-"
				when "jue"
					week_days << "thursday-"
				when "vie"
					week_days << "friday-"
				when "sab"
					week_days << "saturday-"
				when "dom"
					week_days << "sunday-"
			end
		end
		return week_days
	end

	def validate_schedules_quantity
		self.schedules
		errors.add(:schedules, "Se supero la cantidad de horarios permitidos") if self.schedules.size > 7
  end

	def validate_schedules_uniqness
		array = []
		self.schedules.each do |schedule|
			array << schedule.day_of_week
		end
		errors.add(:schedules, "Dia repetido en los horarios") unless array.count == array.uniq.count
	end
	
	private

		def send_email_registration
			if self.legal_agent_email? 
				StoreMailer.registration(self).deliver_now
				StoreMailer.pending(self).deliver_now
			end
		end
end
