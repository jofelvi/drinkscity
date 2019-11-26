# == Schema Information
#
# Table name: users
#
#  id                     :integer          not null, primary key
#  email                  :string           default(""), not null
#  fullname               :string
#  phone                  :string
#  rut                    :string
#  address                :string
#  role                   :integer
#  encrypted_password     :string           default(""), not null
#  reset_password_token   :string
#  reset_password_sent_at :datetime
#  remember_created_at    :datetime
#  sign_in_count          :integer          default(0), not null
#  current_sign_in_at     :datetime
#  last_sign_in_at        :datetime
#  current_sign_in_ip     :string
#  last_sign_in_ip        :string
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  provider               :string
#  uid                    :string
#  oneclick_user          :string
#  store_id               :integer
#

class User < ApplicationRecord
  	resourcify
  	rolify
  	
  	acts_as_favoritor
	has_and_belongs_to_many :stores
	has_and_belongs_to_many :tickets
	has_many :orders, dependent: :destroy
	has_many :products, through: :stores
	has_many :events
	has_many :chat_rooms, dependent: :destroy
	has_many :messages, dependent: :destroy

	has_many :comments, dependent: :destroy

	has_one :validator, class_name: "Order", foreign_key: "validator_id"

	
	#enum role: [ :admin, :store_admin, :validator, :rrpp, :customer, :guest ]
	

	#validates_presence_of :fullname, :rut, :email, :address, :phone
	#validates_uniqueness_of :email, :rut

	#validates :password, confirmation: true, presence: true

	devise :database_authenticatable, :registerable,
	:recoverable, :rememberable, :trackable, :validatable,
	:omniauthable, :omniauth_providers => [:facebook, :google_oauth2]
	
	ratyrate_rater

	has_attached_file :avatar, :styles => { :medium => "300x300>", :thumb => "100x100#" }, :default_url => "/images/:style/missing.png"
	validates_attachment_content_type :avatar, :content_type => /\Aimage\/.*\Z/

	after_create :assign_default_role

  	def assign_default_role
    	add_role(:guest) if self.roles.blank?
  	end

	# Facebook Auth
	def self.new_with_session(params, session)
		super.tap do |user|
			if data = session["devise.facebook_data"] && session["devise.facebook_data"]["extra"]["raw_info"]
				user.email = data["email"] if user.email.blank?
			end
		end
	end

	def self.from_omniauth(auth)
		where(provider: auth.provider, uid: auth.uid).first_or_create do |user|
			user.email = auth.info.email
			user.password = Devise.friendly_token[0,20]
			user.fullname = auth.info.name
			user.avatar = auth.info.image_url
		end
	end

	# Google Auth
	def self.from_omniauth(access_token)
		data = access_token.info
		user = User.where(:email => data["email"]).first

		unless user
			password = Devise.friendly_token[0,20]
			user = User.create(
				fullname: data["name"], 
				email: data["email"],
				password: password, password_confirmation: password
			)
		end
		user
	end
end
